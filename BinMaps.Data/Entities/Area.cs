using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Data.Entities
{
	public class Area
	{
		public Area()
		{
			Bins = new HashSet<TrashContainer>();
		}
		[Key]
		public int Id { get; set; }
		[Required]
		public double LitersFilled { get; set; }
        public bool IsFull { get; set; }
        public IEnumerable<TrashContainer> Bins { get; set; }
		[InverseProperty("Area")]
		public Truck Truck { get; set; }
	}
}
