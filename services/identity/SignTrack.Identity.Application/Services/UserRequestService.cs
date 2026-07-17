using SignTrack.Identity.Application.DTOs.Requests;
using SignTrack.Identity.Application.Exceptions;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Constants;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class UserRequestService(
    IUserRequestRepository requests,
    IGroupRepository groups,
    IAppointmentRepository appointments,
    IUserRepository users,
    IPushNotifier pushNotifier) : IUserRequestService
{
    public async Task<UserRequestResponseDto> SendRequestAsync(string fromUserId, CreateUserRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(fromUserId))
            throw new ArgumentException("Invalid fromUserId", nameof(fromUserId));
        if (string.IsNullOrWhiteSpace(dto.ToUserId))
            throw new ArgumentException("Invalid toUserId", nameof(dto));
        if (fromUserId == dto.ToUserId)
            throw new BusinessException(ErrorCodes.INVALID_REQUEST, "Cannot send a request to yourself");

        var type = dto.Type?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!UserRequestTypes.All.Contains(type))
            throw new ArgumentException($"Invalid request type. Use {string.Join(", ", UserRequestTypes.All)}");

        var fromUser = await users.GetByIdAsync(fromUserId);
        await users.GetByIdAsync(dto.ToUserId);

        Appointment? meetingAppointment = null;

        if (type == UserRequestTypes.GroupInvite)
        {
            if (string.IsNullOrWhiteSpace(dto.GroupId))
                throw new ArgumentException("GroupId is required for group_invite requests");

            await groups.GetByIdAsync(dto.GroupId);

            if (!await groups.IsOwnerAsync(dto.GroupId, fromUserId))
                throw new UnauthorizedAccessException("Only group owners can send group invites");

            if (await groups.IsMemberAsync(dto.GroupId, dto.ToUserId))
                throw new BusinessException(ErrorCodes.MEMBER_ALREADY_EXISTS, "User is already a member of this group");

            if (await requests.ExistsPendingGroupInviteAsync(fromUserId, dto.ToUserId, dto.GroupId))
                throw new BusinessException(ErrorCodes.REQUEST_ALREADY_PENDING, "A pending invite already exists for this user and group");
        }
        else if (type == UserRequestTypes.Meeting)
        {
            if (string.IsNullOrWhiteSpace(dto.AppointmentId))
                throw new ArgumentException("AppointmentId is required for meeting requests");

            meetingAppointment = await appointments.GetByIdAsync(dto.AppointmentId)
                ?? throw new KeyNotFoundException("Cita no encontrada");

            if (meetingAppointment.HostUserId != fromUserId)
                throw new UnauthorizedAccessException("Solo el anfitrión puede invitar a la cita");

            if (meetingAppointment.Participants.Any(p => p.UserId == dto.ToUserId && p.Status == "accepted"))
                throw new BusinessException(ErrorCodes.INVALID_REQUEST, "El usuario ya aceptó la cita");
        }

        var request = new UserRequest
        {
            Id = UuidGenerator.GenerateRequestId(),
            FromUserId = fromUserId,
            ToUserId = dto.ToUserId,
            Type = type,
            Status = UserRequestStatuses.Pending,
            GroupId = dto.GroupId,
            AppointmentId = dto.AppointmentId,
            Message = string.IsNullOrWhiteSpace(dto.Message) ? null : dto.Message.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        var created = await requests.CreateAsync(request);

        var requestLabel = type switch
        {
            UserRequestTypes.GroupInvite => "invitación a grupo",
            UserRequestTypes.Meeting => "invitación a cita",
            _ => "solicitud de contacto"
        };
        await pushNotifier.NotifyUserAsync(
            dto.ToUserId,
            "Nueva solicitud",
            $"{fromUser.Username} te envió una {requestLabel}",
            "/signtrack/dashboard/requests");

        return MapToResponseDto(created, meetingAppointment);
    }

    public async Task<IReadOnlyList<UserRequestResponseDto>> GetInboxAsync(string toUserId)
    {
        if (string.IsNullOrWhiteSpace(toUserId))
            throw new ArgumentException("Invalid toUserId", nameof(toUserId));

        var inbox = await requests.GetInboxAsync(toUserId);
        return inbox.Select(r => MapToResponseDto(r)).ToList();
    }

    public async Task<UserRequestResponseDto> RespondAsync(string requestId, string toUserId, UpdateUserRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            throw new ArgumentException("Invalid requestId", nameof(requestId));
        if (string.IsNullOrWhiteSpace(toUserId))
            throw new ArgumentException("Invalid toUserId", nameof(toUserId));

        var status = dto.Status?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!UserRequestStatuses.ResponseStatuses.Contains(status))
            throw new ArgumentException($"Invalid status. Use {UserRequestStatuses.Accepted} or {UserRequestStatuses.Rejected}");

        var request = await requests.GetByIdAsync(requestId);

        if (request.ToUserId != toUserId)
            throw new UnauthorizedAccessException("You are not the recipient of this request");

        if (request.Status != UserRequestStatuses.Pending)
            throw new BusinessException(ErrorCodes.REQUEST_ALREADY_RESPONDED, "This request has already been responded to");

        request.Status = status;
        request.RespondedAt = DateTime.UtcNow;

        if (status == UserRequestStatuses.Accepted && request.Type == UserRequestTypes.GroupInvite)
        {
            if (string.IsNullOrWhiteSpace(request.GroupId))
                throw new InvalidOperationException("Group invite request is missing groupId");

            if (!await groups.IsMemberAsync(request.GroupId, toUserId))
            {
                var member = new TeamGroupMember
                {
                    Id = UuidGenerator.GenerateMemberId(),
                    GroupId = request.GroupId,
                    UserId = toUserId,
                    Role = TeamGroupMemberRoles.Member,
                    JoinedAt = DateTime.UtcNow
                };

                await groups.AddMemberAsync(member);
            }
        }
        else if (status == UserRequestStatuses.Accepted && request.Type == UserRequestTypes.Meeting)
        {
            if (string.IsNullOrWhiteSpace(request.AppointmentId))
                throw new InvalidOperationException("Meeting request is missing appointmentId");

            var appointment = await appointments.GetByIdAsync(request.AppointmentId)
                ?? throw new KeyNotFoundException("Cita no encontrada");

            var participant = appointment.Participants.FirstOrDefault(p => p.UserId == toUserId);
            if (participant != null)
            {
                participant.Status = "accepted";
            }
            else
            {
                appointment.Participants.Add(new AppointmentParticipant
                {
                    Id = UuidGenerator.GenerateAppointmentParticipantId(),
                    AppointmentId = appointment.Id,
                    UserId = toUserId,
                    Status = "accepted",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await appointments.UpdateAsync(appointment);
        }

        var updated = await requests.UpdateAsync(request);
        return MapToResponseDto(updated);
    }

    private static UserRequestResponseDto MapToResponseDto(UserRequest request, Appointment? appointmentOverride = null)
    {
        var appointment = appointmentOverride ?? request.Appointment;
        return new UserRequestResponseDto
        {
            Id = request.Id,
            FromUserId = request.FromUserId,
            FromUsername = request.FromUser?.Username ?? string.Empty,
            ToUserId = request.ToUserId,
            Type = request.Type,
            Status = request.Status,
            GroupId = request.GroupId,
            GroupName = request.Group?.Name,
            AppointmentId = request.AppointmentId,
            AppointmentTitle = appointment?.Title,
            Message = request.Message,
            CreatedAt = request.CreatedAt,
            RespondedAt = request.RespondedAt
        };
    }
}
