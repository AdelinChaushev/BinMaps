using Microsoft.AspNetCore.Routing;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Data.Entities
{
	public class Truck
	{
		[Key]
		public int Id { get; set; }
		[Required]
		public double Capacity { get; set; }
		[ForeignKey(nameof(Area))]
		public int AreaId { get; set; }
		public Area Area { get; set; }
	}
}
