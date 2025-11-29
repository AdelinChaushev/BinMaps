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
	public class ThrashContainer
	{
		[Key]
		public int Id { get; set; }
		[Required]
		public double Capacity { get; set; }
		[Required]
		public decimal FillPercentage { get; set; }
		[Required]
		public bool IsFilled { get; set; }
		[Required]
		public double LocationX { get; set; }
		[Required]
		public double LocationY { get; set; }

		[Required]
		public double Temperature { get; set; }
		[Required]
		public double BatteryPercentage { get; set; }
        [ForeignKey(nameof(Area))]
		public int AreaId { get; set; }
		public Area Area { get; set; }
	}
}
