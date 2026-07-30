namespace SignTrack.Messaging.Api.Entities;

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "dm";
    public string? GroupId { get; set; }
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ConversationParticipant> Participants { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
}
