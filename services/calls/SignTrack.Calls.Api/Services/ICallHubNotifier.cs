namespace SignTrack.Calls.Api.Services;

public interface ICallHubNotifier
{
    Task NotifyRoomEndedAsync(string roomId);
}
