using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SignTrack.Identity.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupsAndUserRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "team_groups",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_by_user_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_team_groups", x => x.id);
                    table.ForeignKey(
                        name: "fk_team_groups_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "team_group_members",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    group_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    user_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    role = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_team_group_members", x => x.id);
                    table.ForeignKey(
                        name: "fk_team_group_members_team_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "team_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_team_group_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_requests",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    from_user_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    to_user_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    group_id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    responded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_requests", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_requests_team_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "team_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_user_requests_users_from_user_id",
                        column: x => x.from_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_user_requests_users_to_user_id",
                        column: x => x.to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_team_group_members_group_id_user_id",
                table: "team_group_members",
                columns: new[] { "group_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_team_group_members_user_id",
                table: "team_group_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_team_groups_created_by_user_id",
                table: "team_groups",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_requests_from_user_id",
                table: "user_requests",
                column: "from_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_requests_group_id",
                table: "user_requests",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_requests_to_user_id",
                table: "user_requests",
                column: "to_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "team_group_members");

            migrationBuilder.DropTable(
                name: "user_requests");

            migrationBuilder.DropTable(
                name: "team_groups");
        }
    }
}
