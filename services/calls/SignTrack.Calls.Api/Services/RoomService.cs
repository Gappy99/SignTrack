using Microsoft.EntityFrameworkCore;
using SignTrack.Calls.Api.Data;
using SignTrack.Calls.Api.Dtos;
using SignTrack.Calls.Api.Entities;

namespace SignTrack.Calls.Api.Services;

public class RoomService(CallsDbContext db)
{
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
                    DisplayName = "Anfitrión",
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
        {
            return new JoinRoomResponseDto(
                room.Id,
                existing.Id,
                null,
                Array.Empty<object>());
        }

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

        return new JoinRoomResponseDto(room.Id, participant.Id, null, Array.Empty<object>());
    }

    public async Task EndRoomAsync(string userId, string roomId)
    {
        var room = await db.CallRooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Sala no encontrada");

        if (room.HostUserId != userId)
            throw new UnauthorizedAccessException("Solo el anfitrión puede terminar la reunión");

        room.Status = "ended";
        room.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
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
