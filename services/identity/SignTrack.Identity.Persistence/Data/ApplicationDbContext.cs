using SignTrack.Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Cryptography.X509Certificates;

namespace SignTrack.Identity.Persistence.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<UserEmail> UserEmails { get; set; }
    public DbSet<UserPasswordReset> UserPasswordResets { get; set; }
    public DbSet<TeamGroup> TeamGroups { get; set; }
    public DbSet<TeamGroupMember> TeamGroupMembers { get; set; }
    public DbSet<UserRequest> UserRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                entity.SetTableName(ToSnakeCase(tableName));
            }

            foreach (var property in entity.GetProperties())
            {
                var columnName = property.GetColumnName();
                if (!string.IsNullOrEmpty(columnName))
                {
                    property.SetColumnName(ToSnakeCase(columnName));
                }
            }

            foreach (var key in entity.GetKeys())
            {
                var keyName = key.GetName();
                if (!string.IsNullOrEmpty(keyName))
                {
                    key.SetName(ToSnakeCase(keyName));
                }
            }

            foreach (var index in entity.GetIndexes())
            {
                var indexName = index.GetDatabaseName();
                if (!string.IsNullOrEmpty(indexName))
                {
                    index.SetDatabaseName(ToSnakeCase(indexName));
                }
            }
        }

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(25);
            entity.Property(e => e.Surname)
                .IsRequired()
                .HasMaxLength(25);
            entity.Property(e => e.Username)
                .IsRequired();
            entity.Property(e => e.Email)
                .IsRequired();
            entity.Property(e => e.Password)
                .IsRequired()
                .HasMaxLength(255);
            entity.Property(e => e.Status)
                .HasDefaultValue(false);
            entity.Property(e => e.CreatedAt)
                .IsRequired();
            entity.Property(e => e.UpdatedAt)
                .IsRequired();
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();

            entity.HasOne(e => e.UserProfile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);
            entity.HasMany(e => e.UserRoles)
                .WithOne(ur => ur.User)
                .HasForeignKey(ur => ur.UserId);
            entity.HasOne(e => e.UserEmail)
                .WithOne(ue => ue.User)
                .HasForeignKey<UserEmail>(ue => ue.UserId);
            entity.HasOne(e => e.UserPasswordReset)
                .WithOne(upr => upr.User)
                .HasForeignKey<UserPasswordReset>(upr => upr.UserId);
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.UserId)
                .HasMaxLength(16);
            entity.Property(e => e.ProfilePicture).HasDefaultValue("");
            entity.Property(e => e.Phone).HasMaxLength(8);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.UserId)
                .HasMaxLength(16);
            entity.Property(e => e.RoleId)
                .HasMaxLength(16);
            entity.Property(e => e.CreatedAt)
                .IsRequired();
            entity.Property(e => e.UpdatedAt)
                .IsRequired();
            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);
            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);
        });

        modelBuilder.Entity<UserEmail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.UserId)
                .HasMaxLength(16);
            entity.Property(e => e.EmailVerified).HasDefaultValue(false);
            entity.Property(e => e.EmailVerificationToken).HasMaxLength(256);
        });

        modelBuilder.Entity<UserPasswordReset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.UserId)
                .HasMaxLength(16);
            entity.Property(e => e.PasswordResetToken).HasMaxLength(256);
        });

        modelBuilder.Entity<TeamGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(e => e.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(16);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Members)
                .WithOne(m => m.Group)
                .HasForeignKey(m => m.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeamGroupMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.GroupId)
                .IsRequired()
                .HasMaxLength(16);
            entity.Property(e => e.UserId)
                .IsRequired()
                .HasMaxLength(16);
            entity.Property(e => e.Role)
                .IsRequired()
                .HasMaxLength(10);
            entity.Property(e => e.JoinedAt).IsRequired();
            entity.HasIndex(e => new { e.GroupId, e.UserId }).IsUnique();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasMaxLength(16)
                .ValueGeneratedOnAdd();
            entity.Property(e => e.FromUserId)
                .IsRequired()
                .HasMaxLength(16);
            entity.Property(e => e.ToUserId)
                .IsRequired()
                .HasMaxLength(16);
            entity.Property(e => e.Type)
                .IsRequired()
                .HasMaxLength(20);
            entity.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(10);
            entity.Property(e => e.GroupId).HasMaxLength(16);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.HasOne(e => e.FromUser)
                .WithMany()
                .HasForeignKey(e => e.FromUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ToUser)
                .WithMany()
                .HasForeignKey(e => e.ToUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group)
                .WithMany()
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => (e.Entity is User || e.Entity is Role || e.Entity is UserRole || e.Entity is TeamGroup)
                        && (e.State == EntityState.Added || e.State == EntityState.Modified));
        
        foreach(var entry in entries)
        {
            if(entry.Entity is User user)
            {
                if(entry.State == EntityState.Added)
                {
                    user.CreatedAt = DateTime.UtcNow;
                }
                user.UpdatedAt = DateTime.UtcNow;
            }
            else if(entry.Entity is Role role)
            {
                if(entry.State == EntityState.Added)
                {
                    role.CreatedAt = DateTime.UtcNow;
                }
                role.UpdatedAt = DateTime.UtcNow;
            }
            else if(entry.Entity is UserRole userRole)
            {
                if(entry.State == EntityState.Added)
                {
                    userRole.CreatedAt = DateTime.UtcNow;
                }
                userRole.UpdatedAt = DateTime.UtcNow;
            }
            else if(entry.Entity is TeamGroup group)
            {
                if(entry.State == EntityState.Added)
                {
                    group.CreatedAt = DateTime.UtcNow;
                }
                group.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    private static string ToSnakeCase(string input)
    {
        if(string.IsNullOrEmpty(input))
            return input;

        return string.Concat(input.Select((c, i) => i > 0 && char.IsUpper(c) ? "_" + c : c.ToString())).ToLower();
    }
}