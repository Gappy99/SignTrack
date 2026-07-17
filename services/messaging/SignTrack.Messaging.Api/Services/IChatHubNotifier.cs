using SignTrack.Messaging.Api.Dtos;

namespace SignTrack.Messaging.Api.Services;

public interface IChatHubNotifier
{
    Task NotifyMessageAsync(string conversationId, MessageDto message);
}
