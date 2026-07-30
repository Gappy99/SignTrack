using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SignTrack.Calls.Api.Services;

namespace SignTrack.Calls.Api.Hubs;

[Authorize]
public class CallHub(RoomService rooms) : Hub
{
    // Estado en memoria (vive mientras el proceso viva, suficiente para una sesión de
    // videollamada): quién está firmando ahora mismo por sala, para poder informar a
    // quien se une tarde en vez de depender solo del evento de flanco SetSigningStatus.
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, bool>> SigningStatusByRoom = new();

    public static string CallGroup(string roomId) => $"call_{roomId}";

    public static string UserGroup(string userId) => $"user_{userId}";

    private string? GetUserId() =>
        Context.User?.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    // Aditivo: cada conexión autenticada entra a su grupo por-usuario para poder
    // recibir invitaciones ("IncomingCall") sin importar en qué pantalla esté.
    // No interfiere con los grupos por-sala del signaling WebRTC existente.
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

        await base.OnConnectedAsync();
    }

    // Invita a otro usuario a una sala existente. El invitado acepta usando el
    // flujo REST ya existente (POST /rooms/{id}/join); aquí solo se notifica.
    public async Task InviteToCall(string roomId, string targetUserId)
    {
        var fromUserId = GetUserId();
        if (string.IsNullOrEmpty(fromUserId))
            throw new HubException("No autenticado");

        if (string.IsNullOrWhiteSpace(targetUserId) || targetUserId == fromUserId)
            throw new HubException("Destinatario inválido");

        if (!await rooms.IsParticipantAsync(fromUserId, roomId))
            throw new HubException("No perteneces a esta reunión");

        var title = await rooms.GetRoomTitleAsync(roomId)
            ?? throw new HubException("La reunión no está disponible");

        // El JWT no incluye claim de nombre (solo sub/role), así que el nombre
        // visible sale del participante registrado en la sala.
        var fromUserName = await rooms.GetParticipantDisplayNameAsync(fromUserId, roomId) ?? "Alguien";

        await Clients.Group(UserGroup(targetUserId))
            .SendAsync("IncomingCall", new { roomId, title, fromUserId, fromUserName });
    }

    // Aditivo: notifica a los demás participantes que alguien activó/desactivó el
    // panel de reconocimiento de señas, para mostrar un indicador visual en su tile.
    public async Task SetSigningStatus(string roomId, bool isSigning)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;
        if (!await rooms.IsParticipantAsync(userId, roomId)) return;

        var roomState = SigningStatusByRoom.GetOrAdd(roomId, _ => new ConcurrentDictionary<string, bool>());
        if (isSigning) roomState[userId] = true;
        else roomState.TryRemove(userId, out _);

        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("SigningStatusChanged", new { roomId, userId, isSigning });
    }

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

        if (SigningStatusByRoom.TryGetValue(roomId, out var roomState) && !roomState.IsEmpty)
        {
            await Clients.Caller.SendAsync("ExistingSigningStatuses", new { roomId, userIds = roomState.Keys.ToArray() });
        }

        await Clients.OthersInGroup(CallGroup(roomId))
            .SendAsync("ParticipantJoined", new { roomId, userId });
    }

    public async Task LeaveCallRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, CallGroup(roomId));
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            if (SigningStatusByRoom.TryGetValue(roomId, out var roomState))
                roomState.TryRemove(userId, out _);

            await rooms.LeaveRoomAsync(userId, roomId);

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
