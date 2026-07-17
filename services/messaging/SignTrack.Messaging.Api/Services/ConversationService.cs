using Microsoft.EntityFrameworkCore;
using SignTrack.Messaging.Api.Data;
using SignTrack.Messaging.Api.Dtos;
using SignTrack.Messaging.Api.Entities;

namespace SignTrack.Messaging.Api.Services;

public class ConversationService(MessagingDbContext db, IChatHubNotifier chatHub, NotificationService notifications)
{
    public async Task<ConversationListItemDto> CreateConversationAsync(string userId, CreateConversationDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.TargetUserId))
        {
            if (dto.TargetUserId == userId)
                throw new InvalidOperationException("No puedes abrir un chat contigo mismo");

            var existing = await FindDirectConversationAsync(userId, dto.TargetUserId);
            if (existing != null)
                return await MapListItemAsync(existing, userId);

            var conversation = new Conversation
            {
                Id = IdGenerator.ConversationId(),
                Type = "dm",
                Title = dto.Title,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Participants =
                [
                    NewParticipant(userId),
                    NewParticipant(dto.TargetUserId)
                ]
            };
            db.Conversations.Add(conversation);
            await db.SaveChangesAsync();
            return await MapListItemAsync(conversation, userId);
        }

        if (!string.IsNullOrWhiteSpace(dto.GroupId))
        {
            var isMember = await IsGroupMemberAsync(userId, dto.GroupId);
            if (!isMember)
                throw new UnauthorizedAccessException("No eres miembro del grupo");

            var existingGroup = await db.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Type == "group" && c.GroupId == dto.GroupId);

            if (existingGroup != null)
                return await MapListItemAsync(existingGroup, userId);

            var groupMembers = await GetGroupMemberIdsAsync(dto.GroupId);
            var conversation = new Conversation
            {
                Id = IdGenerator.ConversationId(),
                Type = "group",
                GroupId = dto.GroupId,
                Title = dto.Title ?? "Chat de grupo",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Participants = groupMembers.Select(NewParticipant).ToList()
            };
            db.Conversations.Add(conversation);
            await db.SaveChangesAsync();
            return await MapListItemAsync(conversation, userId);
        }

        throw new ArgumentException("Debes enviar targetUserId o groupId");
    }

    public async Task<IReadOnlyList<ConversationListItemDto>> GetMyConversationsAsync(string userId)
    {
        var conversations = await db.Conversations
            .Include(c => c.Participants)
            .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        var result = new List<ConversationListItemDto>();
        foreach (var c in conversations)
            result.Add(await MapListItemAsync(c, userId));
        return result;
    }

    public async Task<MessagesPageDto> GetMessagesAsync(string userId, string conversationId, string? cursor, int limit)
    {
        await EnsureParticipantAsync(userId, conversationId);
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Messages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.SentAt)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var cursorMsg = await db.Messages.FindAsync(cursor);
            if (cursorMsg != null)
                query = query.Where(m => m.SentAt < cursorMsg.SentAt);
        }

        var messages = await query.Take(limit + 1).ToListAsync();
        string? nextCursor = null;
        if (messages.Count > limit)
        {
            nextCursor = messages[limit - 1].Id;
            messages = messages.Take(limit).ToList();
        }

        messages.Reverse();
        return new MessagesPageDto(
            conversationId,
            messages.Select(MapMessage).ToList(),
            nextCursor);
    }

    public async Task<MessageDto> SendMessageAsync(string userId, string conversationId, SendMessageDto dto)
    {
        await EnsureParticipantAsync(userId, conversationId);

        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("El contenido no puede estar vacío");

        var message = new Message
        {
            Id = IdGenerator.MessageId(),
            ConversationId = conversationId,
            SenderUserId = userId,
            Content = dto.Content.Trim(),
            Type = string.IsNullOrWhiteSpace(dto.Type) ? "text" : dto.Type.Trim(),
            SentAt = DateTime.UtcNow
        };

        var conversation = await db.Conversations.FindAsync(conversationId);
        if (conversation != null)
            conversation.UpdatedAt = DateTime.UtcNow;

        db.Messages.Add(message);
        await db.SaveChangesAsync();
        var messageDto = MapMessage(message);
        await chatHub.NotifyMessageAsync(conversationId, messageDto);
        await notifications.NotifyNewMessageAsync(conversationId, userId, message.Content);
        return messageDto;
    }

    public async Task<bool> IsParticipantAsync(string userId, string conversationId)
    {
        return await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);
    }

    private async Task EnsureParticipantAsync(string userId, string conversationId)
    {
        var isParticipant = await db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        if (!isParticipant)
            throw new UnauthorizedAccessException("No tienes acceso a esta conversación");
    }

    private async Task<Conversation?> FindDirectConversationAsync(string userA, string userB)
    {
        return await db.Conversations
            .Include(c => c.Participants)
            .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .Where(c => c.Type == "dm")
            .Where(c =>
                c.Participants.Any(p => p.UserId == userA) &&
                c.Participants.Any(p => p.UserId == userB) &&
                c.Participants.Count == 2)
            .FirstOrDefaultAsync();
    }

    private async Task<bool> IsGroupMemberAsync(string userId, string groupId)
    {
        await using var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT 1 FROM team_group_members
            WHERE group_id = @groupId AND user_id = @userId
            LIMIT 1
            """;
        var pGroup = cmd.CreateParameter();
        pGroup.ParameterName = "groupId";
        pGroup.Value = groupId;
        cmd.Parameters.Add(pGroup);
        var pUser = cmd.CreateParameter();
        pUser.ParameterName = "userId";
        pUser.Value = userId;
        cmd.Parameters.Add(pUser);

        var result = await cmd.ExecuteScalarAsync();
        return result != null;
    }

    private async Task<List<string>> GetGroupMemberIdsAsync(string groupId)
    {
        var ids = new List<string>();
        await using var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT user_id FROM team_group_members WHERE group_id = @groupId";
        var p = cmd.CreateParameter();
        p.ParameterName = "groupId";
        p.Value = groupId;
        cmd.Parameters.Add(p);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            ids.Add(reader.GetString(0));
        return ids;
    }

    private static ConversationParticipant NewParticipant(string userId) => new()
    {
        Id = IdGenerator.ParticipantId(),
        UserId = userId,
        JoinedAt = DateTime.UtcNow
    };

    public async Task<int> GetTotalUnreadAsync(string userId)
    {
        var participations = await db.ConversationParticipants
            .Where(p => p.UserId == userId)
            .ToListAsync();

        var total = 0;
        foreach (var p in participations)
            total += await CountUnreadAsync(userId, p.ConversationId, p);
        return total;
    }

    public async Task MarkReadAsync(string userId, string conversationId)
    {
        var participant = await db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId)
            ?? throw new UnauthorizedAccessException("No tienes acceso a esta conversación");

        participant.LastReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task<ConversationListItemDto> GetOrCreateCallRoomConversationAsync(string userId, string roomId)
    {
        var existing = await db.Conversations
            .Include(c => c.Participants)
            .Include(c => c.Messages.OrderByDescending(m => m.SentAt).Take(1))
            .FirstOrDefaultAsync(c => c.Type == "call" && c.GroupId == roomId);

        if (existing != null)
        {
            await EnsureParticipantAsync(userId, existing.Id);
            return await MapListItemAsync(existing, userId);
        }

        var memberIds = await GetCallRoomMemberIdsAsync(roomId);
        if (!memberIds.Contains(userId))
            throw new UnauthorizedAccessException("No perteneces a esta reunión");

        var conversation = new Conversation
        {
            Id = IdGenerator.ConversationId(),
            Type = "call",
            GroupId = roomId,
            Title = "Chat de reunión",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Participants = memberIds.Select(NewParticipant).ToList()
        };

        db.Conversations.Add(conversation);
        await db.SaveChangesAsync();
        return await MapListItemAsync(conversation, userId);
    }

    private async Task<List<string>> GetCallRoomMemberIdsAsync(string roomId)
    {
        var ids = new List<string>();
        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT user_id FROM room_participants WHERE room_id = @roomId";
        var p = cmd.CreateParameter();
        p.ParameterName = "roomId";
        p.Value = roomId;
        cmd.Parameters.Add(p);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            ids.Add(reader.GetString(0));
        return ids;
    }

    private async Task<int> CountUnreadAsync(string userId, string conversationId, ConversationParticipant? participant = null)
    {
        participant ??= await db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        if (participant == null) return 0;

        var since = participant.LastReadAt ?? participant.JoinedAt;
        return await db.Messages.CountAsync(m =>
            m.ConversationId == conversationId &&
            m.SenderUserId != userId &&
            m.SentAt > since);
    }

    private async Task<ConversationListItemDto> MapListItemAsync(Conversation c, string userId)
    {
        var last = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault();
        if (last == null)
        {
            last = await db.Messages
                .Where(m => m.ConversationId == c.Id)
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();
        }

        return new ConversationListItemDto(
            c.Id,
            c.Type,
            c.GroupId,
            c.Title,
            last?.Content,
            last?.SentAt,
            c.UpdatedAt,
            await CountUnreadAsync(userId, c.Id));
    }

    private static MessageDto MapMessage(Message m) => new(
        m.Id,
        m.ConversationId,
        m.SenderUserId,
        m.Content,
        m.Type,
        m.SentAt);
}
