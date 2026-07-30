namespace SignTrack.Identity.Application.Interfaces;

public interface ICallsRoomClient
{
    Task<string> CreateRoomAsync(string authorizationHeader, string title, int maxParticipants = 8);
}
