namespace SignTrack.Calls.Api.Entities;

public class RoomParticipant
{
    public string Id { get; set; } = string.Empty;
    public string RoomId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }

    public CallRoom Room { get; set; } = null!;
}
