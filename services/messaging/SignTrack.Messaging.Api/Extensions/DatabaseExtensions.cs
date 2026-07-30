using System.Data;
using Microsoft.EntityFrameworkCore;
using SignTrack.Messaging.Api.Data;

namespace SignTrack.Messaging.Api.Extensions;

public static class DatabaseExtensions
{
    public static async Task EnsureMessagingSchemaAsync(this MessagingDbContext db)
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync();

        if (!await TableExistsAsync(conn, "conversations"))
        {
            var script = db.Database.GenerateCreateScript();
            await db.Database.ExecuteSqlRawAsync(script);
        }

        if (await TableExistsAsync(conn, "conversation_participants"))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_read_at timestamptz;");
        }

        if (await TableExistsAsync(conn, "conversations"))
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE conversations ALTER COLUMN group_id TYPE character varying(20);");
        }

        if (!await TableExistsAsync(conn, "push_subscriptions"))
        {
            await db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE push_subscriptions (
                    id character varying(20) NOT NULL PRIMARY KEY,
                    user_id character varying(16) NOT NULL,
                    endpoint text NOT NULL,
                    p256dh text NOT NULL,
                    auth text NOT NULL,
                    created_at timestamp with time zone NOT NULL
                );
                CREATE UNIQUE INDEX ix_push_subscriptions_user_endpoint
                    ON push_subscriptions (user_id, endpoint);
                CREATE INDEX ix_push_subscriptions_user_id
                    ON push_subscriptions (user_id);
                """);
        }
    }

    private static async Task<bool> TableExistsAsync(System.Data.Common.DbConnection conn, string tableName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = @tableName
            )
            """;
        var p = cmd.CreateParameter();
        p.ParameterName = "tableName";
        p.Value = tableName;
        cmd.Parameters.Add(p);
        return (bool)(await cmd.ExecuteScalarAsync() ?? false);
    }
}
