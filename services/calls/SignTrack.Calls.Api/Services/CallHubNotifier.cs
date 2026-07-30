using Microsoft.AspNetCore.SignalR;
using SignTrack.Calls.Api.Hubs;

namespace SignTrack.Calls.Api.Services;

public class CallHubNotifier(IHubContext<CallHub> hub) : ICallHubNotifier
{
    public Task NotifyRoomEndedAsync(string roomId) =>
        hub.Clients.Group(CallHub.CallGroup(roomId))
            .SendAsync("RoomEnded", new { roomId });
}
