using SignTrack.Identity.Application.DTOs.Appointments;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class AppointmentService(IAppointmentRepository appointments, IUserRepository users) : IAppointmentService
{
    public async Task<AppointmentResponseDto> CreateAsync(string userId, CreateAppointmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Title is required");
        if (dto.EndUtc <= dto.StartUtc)
            throw new ArgumentException("EndUtc must be after StartUtc");

        await users.GetByIdAsync(userId);

        var appointment = new Appointment
        {
            Id = UuidGenerator.GenerateAppointmentId(),
            Title = dto.Title.Trim(),
            HostUserId = userId,
            StartUtc = dto.StartUtc,
            EndUtc = dto.EndUtc,
            Participants =
            [
                new AppointmentParticipant
                {
                    Id = UuidGenerator.GenerateAppointmentParticipantId(),
                    UserId = userId,
                    Status = "accepted",
                    CreatedAt = DateTime.UtcNow
                }
            ]
        };

        if (dto.ParticipantUserIds != null)
        {
            foreach (var participantId in dto.ParticipantUserIds.Distinct())
            {
                if (participantId == userId) continue;
                await users.GetByIdAsync(participantId);
                appointment.Participants.Add(new AppointmentParticipant
                {
                    Id = UuidGenerator.GenerateAppointmentParticipantId(),
                    UserId = participantId,
                    Status = "invited",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        var created = await appointments.CreateAsync(appointment);
        return Map(created);
    }

    public async Task<IReadOnlyList<AppointmentResponseDto>> ListAsync(string userId)
    {
        var items = await appointments.ListForUserAsync(userId);
        return items.Select(Map).ToList();
    }

    public async Task<AppointmentResponseDto> LinkRoomAsync(string userId, string appointmentId, string roomId)
    {
        var appointment = await appointments.GetByIdAsync(appointmentId)
            ?? throw new KeyNotFoundException("Cita no encontrada");

        if (appointment.HostUserId != userId)
            throw new UnauthorizedAccessException("Solo el anfitrión puede vincular una sala");

        appointment.RoomId = roomId;
        await appointments.UpdateAsync(appointment);
        return Map(appointment);
    }

    private static AppointmentResponseDto Map(Appointment a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        HostUserId = a.HostUserId,
        StartUtc = a.StartUtc,
        EndUtc = a.EndUtc,
        RoomId = a.RoomId,
        CreatedAt = a.CreatedAt,
        Participants = a.Participants.Select(p => new AppointmentParticipantDto
        {
            UserId = p.UserId,
            Status = p.Status
        }).ToList()
    };
}
