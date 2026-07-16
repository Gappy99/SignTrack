using Microsoft.EntityFrameworkCore;
using SignTrack.Calls.Api.Entities;

namespace SignTrack.Calls.Api.Data;

public class CallsDbContext(DbContextOptions<CallsDbContext> options) : DbContext(options)
{
    public DbSet<CallRoom> CallRooms => Set<CallRoom>();
    public DbSet<RoomParticipant> RoomParticipants => Set<RoomParticipant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CallRoom>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.Title).HasMaxLength(120).IsRequired();
            e.Property(x => x.HostUserId).HasMaxLength(16).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.HasMany(x => x.Participants).WithOne(p => p.Room).HasForeignKey(p => p.RoomId);
        });

        modelBuilder.Entity<RoomParticipant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(20);
            e.Property(x => x.RoomId).HasMaxLength(20).IsRequired();
            e.Property(x => x.UserId).HasMaxLength(16).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(80);
            e.HasIndex(x => new { x.RoomId, x.UserId }).IsUnique();
        });
    }
}
