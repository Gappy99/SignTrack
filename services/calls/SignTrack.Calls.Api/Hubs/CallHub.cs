using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SignTrack.Calls.Api.Services;

namespace SignTrack.Calls.Api.Hubs;

[Authorize]
public class CallHub(RoomService rooms) : Hub
{
    public static string CallGroup(string roomId) => $"call_{roomId}";

    private string? GetUserId() =>
        Context.User?.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    public async Task JoinCallRoom(string roomId)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            throw new HubException("No autenticado");

        if (!await rooms.IsParticipantAsync(userId, roomId))
            throw new HubException("No perteneces a esta reunión");

        await Groups.AddToGroupAsync(Context.ConnectionId, CallGroup(roomId));

        var others = await rooms.GetOtherParticipantUserIdsAsync(userId, roomId);
        await Clients.Caller.SendAsync("ExistingParticipants", new { roomId, userIds = others });
        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("ParticipantJoined", new { roomId, userId });
    }

    public async Task LeaveCallRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, CallGroup(roomId));
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            await Clients.OthersInGroup(CallGroup(roomId))
                .SendAsync("ParticipantLeft", new { roomId, userId });
        }
    }

    public async Task SendOffer(string roomId, string targetUserId, object sdp)
    {
        var fromUserId = GetUserId();
        if (string.IsNullOrEmpty(fromUserId)) return;

        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("ReceiveOffer", new { roomId, fromUserId, targetUserId, sdp });
    }

    public async Task SendAnswer(string roomId, string targetUserId, object sdp)
    {
        var fromUserId = GetUserId();
        if (string.IsNullOrEmpty(fromUserId)) return;

        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("ReceiveAnswer", new { roomId, fromUserId, targetUserId, sdp });
    }

    public async Task SendIceCandidate(string roomId, string targetUserId, object candidate)
    {
        var fromUserId = GetUserId();
        if (string.IsNullOrEmpty(fromUserId)) return;

        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("ReceiveIceCandidate", new { roomId, fromUserId, targetUserId, candidate });
    }
}
