namespace SignTrack.Messaging.Api.Entities;

public class Message
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string SenderUserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public DateTime SentAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
}
