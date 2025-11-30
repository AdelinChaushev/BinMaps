using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace BinMaps.Data
{
	public class BinMapsDbContext : IdentityDbContext
	{
		public BinMapsDbContext(DbContextOptions<BinMapsDbContext> options)
		: base(options)
		{
		}
		public DbSet<Truck> Trucks { get; set; }
		public DbSet<TrashContainer> TrashContainers { get; set; }
		public DbSet<Area> Areas { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<ReportType> ReportTypes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            
            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReportType)
                .WithMany(rt => rt.Reports)
                .HasForeignKey(r => r.ReportTypeId);

            
            modelBuilder.Entity<Area>()
                .HasOne(a => a.Truck)
                .WithOne(t => t.Area)
                .HasForeignKey<Truck>(t => t.AreaId);

            modelBuilder.Entity<Area>().HasData(new
            {
                Id = 1,
                Name = "South",
                IsFull = false,
                LitersFilled = 0.0

            },new
            {
                Id = 2,
                Name = "North",
                IsFull = false,
                LitersFilled = 0.0
            });
           // Relative to project root

            // Example: Read and seed
            modelBuilder.Entity<IdentityRole>().HasData(
               new IdentityRole()
               {
                     Id = "1",
                     Name = "Admin",
                     NormalizedName = "ADMIN"
               },
                new IdentityRole()
                {
                     Id = "2",
                     Name = "Driver",
                     NormalizedName = "DRIVER"
                }
            );
          
            modelBuilder.Entity<ReportType>().HasData(
                new ReportType()
                {
                    Id = 1,
                    Name = "Damaged Container"
                },
                new ReportType()
                {
                    Id = 2,
                    Name = "Overflowing Container"
                },
                new ReportType()
                {
                    Id = 3,
                    Name = "Incorrect Location"
                }
            );
            modelBuilder.Entity<Truck>().HasData(
                new Truck()
                {
                    Id = 1,
                    Capacity = 15000.0,
                    AreaId = 1,
                    DriverId = "6315b51c-7181-4631-90f1-f41a8ca5ebc1"
                },
                new Truck()
                {
                    Id = 2,
                    Capacity = 15000.0,
                    AreaId = 2,
                    DriverId = "c2c8ec27-4200-4d88-972b-a6bc69fe2320"
                }
            );


        }

    }
}
