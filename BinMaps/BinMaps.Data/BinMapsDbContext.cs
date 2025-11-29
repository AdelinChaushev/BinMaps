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
	}
}
