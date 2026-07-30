using Microsoft.EntityFrameworkCore;
using SignTrack.Messaging.Api.Entities;

namespace SignTrack.Messaging.Api.Data;

public class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Conversation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.Type).HasMaxLength(10).IsRequired();
            e.Property(x => x.GroupId).HasMaxLength(20);
            e.Property(x => x.Title).HasMaxLength(120);
            e.HasMany(x => x.Participants).WithOne(p => p.Conversation).HasForeignKey(p => p.ConversationId);
            e.HasMany(x => x.Messages).WithOne(m => m.Conversation).HasForeignKey(m => m.ConversationId);
        });

        modelBuilder.Entity<ConversationParticipant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.ConversationId).HasMaxLength(20).IsRequired();
            e.Property(x => x.UserId).HasMaxLength(16).IsRequired();
            e.HasIndex(x => new { x.ConversationId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.ConversationId).HasMaxLength(20).IsRequired();
            e.Property(x => x.SenderUserId).HasMaxLength(16).IsRequired();
            e.Property(x => x.Content).HasMaxLength(4000).IsRequired();
            e.Property(x => x.Type).HasMaxLength(20).IsRequired();
            e.HasIndex(x => new { x.ConversationId, x.SentAt });
        });

        modelBuilder.Entity<PushSubscription>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.UserId).HasMaxLength(16).IsRequired();
            e.Property(x => x.Endpoint).IsRequired();
            e.Property(x => x.P256dh).IsRequired();
            e.Property(x => x.Auth).IsRequired();
            e.HasIndex(x => new { x.UserId, x.Endpoint }).IsUnique();
        });
    }
}
