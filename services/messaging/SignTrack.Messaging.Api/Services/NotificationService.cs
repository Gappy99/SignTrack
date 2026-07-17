using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SignTrack.Messaging.Api.Configuration;
using SignTrack.Messaging.Api.Data;
using SignTrack.Messaging.Api.Dtos;
using SignTrack.Messaging.Api.Entities;
using System.Text.Json;
using WebPush;

namespace SignTrack.Messaging.Api.Services;

public class NotificationService(
    MessagingDbContext db,
    IOptions<WebPushSettings> pushOptions,
    ILogger<NotificationService> logger)
{
    private readonly WebPushSettings _settings = pushOptions.Value;
    private readonly WebPushClient _client = new();

    public string? GetVapidPublicKey() =>
        _settings.Enabled ? _settings.PublicKey : null;

    public async Task SubscribeAsync(string userId, PushSubscribeDto dto)
    {
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == dto.Endpoint);

        if (existing != null)
        {
            existing.P256dh = dto.Keys.P256dh;
            existing.Auth = dto.Keys.Auth;
        }
        else
        {
            db.PushSubscriptions.Add(new Entities.PushSubscription
            {
                Id = IdGenerator.PushSubscriptionId(),
                UserId = userId,
                Endpoint = dto.Endpoint,
                P256dh = dto.Keys.P256dh,
                Auth = dto.Keys.Auth,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }

    public async Task UnsubscribeAsync(string userId, string endpoint)
    {
        var sub = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);
        if (sub != null)
        {
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync();
        }
    }

    public async Task NotifyUserAsync(string userId, string title, string body, string? url = null)
    {
        if (!_settings.Enabled) return;

        var subscriptions = await db.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            title,
            body,
            url = url ?? "/signtrack/dashboard"
        });

        var vapid = new VapidDetails(_settings.Subject, _settings.PublicKey, _settings.PrivateKey);

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await _client.SendNotificationAsync(pushSub, payload, vapid);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                db.PushSubscriptions.Remove(sub);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Push falló para {UserId}", sub.UserId);
            }
        }

        await db.SaveChangesAsync();
    }

    public async Task NotifyNewMessageAsync(string conversationId, string senderUserId, string preview)
    {
        if (!_settings.Enabled) return;

        var recipientIds = await db.ConversationParticipants
            .Where(p => p.ConversationId == conversationId && p.UserId != senderUserId)
            .Select(p => p.UserId)
            .ToListAsync();

        if (recipientIds.Count == 0) return;

        var subscriptions = await db.PushSubscriptions
            .Where(s => recipientIds.Contains(s.UserId))
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            title = "SignTrack — nuevo mensaje",
            body = preview.Length > 120 ? preview[..120] + "…" : preview,
            conversationId,
            url = $"/signtrack/dashboard/chats/{conversationId}"
        });

        var vapid = new VapidDetails(_settings.Subject, _settings.PublicKey, _settings.PrivateKey);

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await _client.SendNotificationAsync(pushSub, payload, vapid);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                db.PushSubscriptions.Remove(sub);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Push falló para {UserId}", sub.UserId);
            }
        }

        await db.SaveChangesAsync();
    }
}
