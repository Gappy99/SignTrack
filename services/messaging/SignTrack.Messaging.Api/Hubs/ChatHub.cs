using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SignTrack.Messaging.Api.Services;

namespace SignTrack.Messaging.Api.Hubs;

[Authorize]
public class ChatHub(ConversationService conversations, PresenceService presence) : Hub
{
    public static string ConversationGroup(string conversationId) => $"conv_{conversationId}";

    private string? GetUserId() =>
        Context.User?.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    public async Task JoinConversation(string conversationId)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            throw new HubException("No autenticado");

        if (!await conversations.IsParticipantAsync(userId, conversationId))
            throw new HubException("No tienes acceso a esta conversación");

        await Groups.AddToGroupAsync(Context.ConnectionId, ConversationGroup(conversationId));
        await presence.SetOnlineAsync(userId);
        await Clients.OthersInGroup(ConversationGroup(conversationId))
            .SendAsync("UserOnline", new { userId, conversationId });
    }

    public async Task JoinPresence()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;
        await presence.SetOnlineAsync(userId);
        await Clients.Others.SendAsync("UserPresenceChanged", new { userId, online = true });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            await presence.SetOfflineAsync(userId);
            await Clients.Others.SendAsync("UserPresenceChanged", new { userId, online = false });
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConversationGroup(conversationId));
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            await Clients.OthersInGroup(ConversationGroup(conversationId))
                .SendAsync("UserOffline", new { userId, conversationId });
        }
    }

    public async Task SendTyping(string conversationId, bool isTyping)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;

        await Clients.OthersInGroup(ConversationGroup(conversationId))
            .SendAsync("UserTyping", new { conversationId, userId, isTyping });
    }
}
