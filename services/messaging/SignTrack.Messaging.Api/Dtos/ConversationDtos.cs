namespace SignTrack.Messaging.Api.Dtos;

public record CreateConversationDto(string? TargetUserId, string? GroupId, string? Title);

public record SendMessageDto(string Content, string? Type = "text");

public record ConversationListItemDto(
    string Id,
    string Type,
    string? GroupId,
    string? Title,
    string? LastMessagePreview,
    DateTime? LastMessageAt,
    DateTime UpdatedAt,
    int UnreadCount);

public record PushSubscribeDto(string Endpoint, PushKeysDto Keys);

public record PushKeysDto(string P256dh, string Auth);

public record MessageDto(
    string Id,
    string ConversationId,
    string SenderUserId,
    string Content,
    string Type,
    DateTime SentAt);

public record MessagesPageDto(
    string ConversationId,
    IReadOnlyList<MessageDto> Messages,
    string? NextCursor);
