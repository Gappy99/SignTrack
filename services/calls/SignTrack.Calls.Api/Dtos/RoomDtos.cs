namespace SignTrack.Calls.Api.Dtos;

public record CreateRoomDto(string Title, int? MaxParticipants);

public record JoinRoomDto(string? DisplayName);

public record RoomListItemDto(
    string Id,
    string Title,
    string HostUserId,
    string Status,
    int ParticipantCount,
    int MaxParticipants,
    DateTime CreatedAt);

public record RoomParticipantDto(string UserId, string DisplayName, DateTime JoinedAt);

public record RoomDetailDto(
    string Id,
    string Title,
    string HostUserId,
    string Status,
    int MaxParticipants,
    int ParticipantCount,
    IReadOnlyList<RoomParticipantDto> Participants,
    DateTime CreatedAt);

public record JoinRoomResponseDto(
    string RoomId,
    string ParticipantId,
    string? SignalingUrl,
    IReadOnlyList<object> IceServers);
