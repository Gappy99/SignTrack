namespace SignTrack.Identity.Application.Interfaces;

public interface IPushNotifier
{
    Task NotifyUserAsync(string userId, string title, string body, string? url = null);
}
