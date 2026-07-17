namespace SignTrack.Messaging.Api.Entities;

public class ConversationParticipant
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
}
