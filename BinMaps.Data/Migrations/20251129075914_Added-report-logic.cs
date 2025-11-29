using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BinMaps.Data.Migrations
{
    public partial class Addedreportlogic : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriverId",
                table: "Trucks",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsFull",
                table: "Areas",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Trucks_DriverId",
                table: "Trucks",
                column: "DriverId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trucks_AspNetUsers_DriverId",
                table: "Trucks",
                column: "DriverId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trucks_AspNetUsers_DriverId",
                table: "Trucks");

            migrationBuilder.DropIndex(
                name: "IX_Trucks_DriverId",
                table: "Trucks");

            migrationBuilder.DropColumn(
                name: "DriverId",
                table: "Trucks");

            migrationBuilder.DropColumn(
                name: "IsFull",
                table: "Areas");
        }
    }
}
