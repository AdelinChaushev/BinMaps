using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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
		public DbSet<ThrashContainer> ThrashContainers { get; set; }
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
        }

    }
}
