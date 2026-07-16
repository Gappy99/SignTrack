using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SignTrack.Identity.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentIdToUserRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "appointment_id",
                table: "user_requests",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_requests_appointment_id",
                table: "user_requests",
                column: "appointment_id");

            migrationBuilder.AddForeignKey(
                name: "fk_user_requests_appointments_appointment_id",
                table: "user_requests",
                column: "appointment_id",
                principalTable: "appointments",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_user_requests_appointments_appointment_id",
                table: "user_requests");

            migrationBuilder.DropIndex(
                name: "ix_user_requests_appointment_id",
                table: "user_requests");

            migrationBuilder.DropColumn(
                name: "appointment_id",
                table: "user_requests");
        }
    }
}
