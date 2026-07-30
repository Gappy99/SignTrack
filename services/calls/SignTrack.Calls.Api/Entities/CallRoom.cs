namespace SignTrack.Calls.Api.Entities;

public class CallRoom
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostUserId { get; set; } = string.Empty;
    public string Status { get; set; } = "waiting";
    public int MaxParticipants { get; set; } = 8;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    public ICollection<RoomParticipant> Participants { get; set; } = [];
}
