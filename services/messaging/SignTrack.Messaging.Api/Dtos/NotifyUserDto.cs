namespace SignTrack.Messaging.Api.Dtos;

public record NotifyUserDto(string UserId, string Title, string Body, string? Url = null);
