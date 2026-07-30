using Microsoft.AspNetCore.SignalR;
using SignTrack.Messaging.Api.Dtos;
using SignTrack.Messaging.Api.Hubs;

namespace SignTrack.Messaging.Api.Services;

public class ChatHubNotifier(IHubContext<ChatHub> hub) : IChatHubNotifier
{
    public Task NotifyMessageAsync(string conversationId, MessageDto message) =>
        hub.Clients.Group(ChatHub.ConversationGroup(conversationId))
            .SendAsync("ReceiveMessage", message);
}
