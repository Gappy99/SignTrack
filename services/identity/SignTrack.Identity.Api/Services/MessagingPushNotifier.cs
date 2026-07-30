using System.Net.Http.Headers;
using System.Net.Http.Json;
using SignTrack.Identity.Application.Interfaces;

namespace SignTrack.Identity.Api.Services;

public class MessagingPushNotifier(
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<MessagingPushNotifier> logger) : IPushNotifier
{
    public async Task NotifyUserAsync(string userId, string title, string body, string? url = null)
    {
        var token = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogDebug("Push omitido: sin token de autorización en la petición actual");
            return;
        }

        try
        {
            var client = httpClientFactory.CreateClient("Messaging");
            client.DefaultRequestHeaders.Authorization = AuthenticationHeaderValue.Parse(token);
            var response = await client.PostAsJsonAsync("/api/v1/notifications/notify-user", new
            {
                userId,
                title,
                body,
                url = url ?? "/signtrack/dashboard/requests"
            });

            if (!response.IsSuccessStatusCode)
                logger.LogWarning("Push notify-user respondió {Status}", response.StatusCode);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo enviar push a {UserId}", userId);
        }
    }
}
