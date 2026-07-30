using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SignTrack.Calls.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCallHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ended_at",
                table: "call_rooms",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ended_at",
                table: "call_rooms");
        }
    }
}
