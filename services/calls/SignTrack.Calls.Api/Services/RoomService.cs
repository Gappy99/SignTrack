using Microsoft.EntityFrameworkCore;
using SignTrack.Calls.Api.Configuration;
using SignTrack.Calls.Api.Data;
using SignTrack.Calls.Api.Dtos;
using SignTrack.Calls.Api.Entities;

namespace SignTrack.Calls.Api.Services;

public class RoomService(CallsDbContext db, IConfiguration configuration, LiveKitTokenService liveKit, ICallHubNotifier callHub)
{
    private static readonly IceServerDto[] DefaultIceServers =
    [
        new("stun:stun.l.google.com:19302"),
        new("stun:stun1.l.google.com:19302")
    ];

    public async Task<bool> IsParticipantAsync(string userId, string roomId) =>
        await db.RoomParticipants.AnyAsync(p => p.RoomId == roomId && p.UserId == userId);

    /// <summary>Título de una sala no terminada, sin cargar participantes (consulta ligera para invitaciones).</summary>
    public async Task<string?> GetRoomTitleAsync(string roomId) =>
        await db.CallRooms
            .Where(r => r.Id == roomId && r.Status != "ended")
            .Select(r => r.Title)
            .FirstOrDefaultAsync();

    /// <summary>Nombre visible con el que un usuario figura en una sala (consulta ligera).</summary>
    public async Task<string?> GetParticipantDisplayNameAsync(string userId, string roomId) =>
        await db.RoomParticipants
            .Where(p => p.RoomId == roomId && p.UserId == userId)
            .Select(p => p.DisplayName)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<string>> GetOtherParticipantUserIdsAsync(string userId, string roomId) =>
        await db.RoomParticipants
            .Where(p => p.RoomId == roomId && p.UserId != userId)
            .Select(p => p.UserId)
            .ToListAsync();

    private JoinRoomResponseDto BuildJoinResponse(CallRoom room, string participantId)
    {
        var iceServers = configuration.GetSection("WebRtc:IceServers").Get<IceServerDto[]>() ?? DefaultIceServers;
        var useLiveKit = liveKit.ShouldUseLiveKit(room.Participants.Count, room.MaxParticipants);
        return new JoinRoomResponseDto(
            room.Id,
            participantId,
            "/hubs/calls",
            iceServers,
            useLiveKit,
            useLiveKit ? liveKit.Url : null);
    }

    public LiveKitTokenDto GetLiveKitToken(string userId, string roomId)
    {
        var room = db.CallRooms
            .Include(r => r.Participants)
            .FirstOrDefault(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Sala no encontrada");

        EnsureParticipant(room, userId);

        if (!liveKit.ShouldUseLiveKit(room.Participants.Count, room.MaxParticipants))
            throw new InvalidOperationException("Esta sala usa WebRTC mesh (1:1). LiveKit no aplica.");

        var participant = room.Participants.First(p => p.UserId == userId);
        return liveKit.CreateToken(room.Id, userId, participant.DisplayName);
    }
    public async Task<RoomListItemDto> CreateRoomAsync(string userId, CreateRoomDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("El título es requerido");

        var max = dto.MaxParticipants is > 0 and <= 50 ? dto.MaxParticipants.Value : 8;
        var now = DateTime.UtcNow;
        var room = new CallRoom
        {
            Id = IdGenerator.RoomId(),
            Title = dto.Title.Trim(),
            HostUserId = userId,
            Status = "waiting",
            MaxParticipants = max,
            CreatedAt = now,
            UpdatedAt = now,
            Participants =
            [
                new RoomParticipant
                {
                    Id = IdGenerator.ParticipantId(),
                    UserId = userId,
                    DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? "Anfitrión" : dto.DisplayName.Trim(),
                    JoinedAt = now
                }
            ]
        };

        db.CallRooms.Add(room);
        await db.SaveChangesAsync();
        return MapListItem(room);
    }

    public async Task<IReadOnlyList<RoomListItemDto>> GetMyRoomsAsync(string userId)
    {
        var rooms = await db.CallRooms
            .Include(r => r.Participants)
            .Where(r => r.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();

        return rooms.Select(MapListItem).ToList();
    }

    public async Task<RoomDetailDto> GetRoomAsync(string userId, string roomId)
    {
        var room = await GetRoomWithParticipantsAsync(roomId);
        EnsureParticipant(room, userId);
        return MapDetail(room);
    }

    public async Task<JoinRoomResponseDto> JoinRoomAsync(string userId, string roomId, JoinRoomDto dto)
    {
        var room = await GetRoomWithParticipantsAsync(roomId);

        if (room.Status == "ended")
            throw new InvalidOperationException("La reunión ya terminó");

        var existing = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (existing != null)
            return BuildJoinResponse(room, existing.Id);

        if (room.Participants.Count >= room.MaxParticipants)
            throw new InvalidOperationException("La sala está llena");

        var participant = new RoomParticipant
        {
            Id = IdGenerator.ParticipantId(),
            RoomId = room.Id,
            UserId = userId,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? "Participante" : dto.DisplayName.Trim(),
            JoinedAt = DateTime.UtcNow
        };

        room.Participants.Add(participant);
        room.Status = "active";
        room.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return BuildJoinResponse(room, participant.Id);
    }

    // Libera el lugar del usuario en la sala. Sin esto, salir de una llamada
    // nunca liberaba el cupo y la sala quedaba "llena" para siempre despues
    // de que el maximo de personas hubiera entrado alguna vez.
    public async Task LeaveRoomAsync(string userId, string roomId)
    {
        var participant = await db.RoomParticipants
            .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == userId);
        if (participant == null) return;

        db.RoomParticipants.Remove(participant);
        await db.SaveChangesAsync();
    }

    public async Task EndRoomAsync(string userId, string roomId)
    {
        var room = await db.CallRooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Sala no encontrada");

        if (room.HostUserId != userId)
            throw new UnauthorizedAccessException("Solo el anfitrión puede terminar la reunión");

        room.Status = "ended";
        room.EndedAt = DateTime.UtcNow;
        room.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await callHub.NotifyRoomEndedAsync(roomId);
    }

    public async Task<IReadOnlyList<CallHistoryItemDto>> GetHistoryAsync(string userId)
    {
        var ended = await db.CallRooms
            .Include(r => r.Participants)
            .Where(r => r.Status == "ended" && r.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(r => r.EndedAt ?? r.UpdatedAt)
            .ToListAsync();

        return ended.Select(r =>
        {
            // Salas terminadas antes de esta feature no tienen EndedAt: UpdatedAt
            // se escribía al terminar, así que sirve de aproximación.
            var endedAt = r.EndedAt ?? r.UpdatedAt;
            var durationSeconds = (int)Math.Max(0, (endedAt - r.CreatedAt).TotalSeconds);
            return new CallHistoryItemDto(
                r.Id,
                r.Title,
                r.HostUserId,
                r.Participants.Count,
                r.CreatedAt,
                endedAt,
                durationSeconds);
        }).ToList();
    }

    private async Task<CallRoom> GetRoomWithParticipantsAsync(string roomId)
    {
        return await db.CallRooms
            .Include(r => r.Participants)
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Sala no encontrada");
    }

    private static void EnsureParticipant(CallRoom room, string userId)
    {
        if (!room.Participants.Any(p => p.UserId == userId))
            throw new UnauthorizedAccessException("No perteneces a esta reunión");
    }

    private static RoomListItemDto MapListItem(CallRoom room) => new(
        room.Id,
        room.Title,
        room.HostUserId,
        room.Status,
        room.Participants.Count,
        room.MaxParticipants,
        room.CreatedAt);

    private static RoomDetailDto MapDetail(CallRoom room) => new(
        room.Id,
        room.Title,
        room.HostUserId,
        room.Status,
        room.MaxParticipants,
        room.Participants.Count,
        room.Participants
            .OrderBy(p => p.JoinedAt)
            .Select(p => new RoomParticipantDto(p.UserId, p.DisplayName, p.JoinedAt))
            .ToList(),
        room.CreatedAt);
}
