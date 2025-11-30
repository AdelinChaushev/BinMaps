using BinMaps.Common.TrashContainerViewModel;
using BinMaps.Core.Contracts;
using BinMaps.Data;
using BinMaps.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Services
{
    public class TrashContainerServices : ITrashContainerServices
    {
        private IRepository<TrashContainer,int> repository;

        private IRepository<Area, int> areaRepository;

        public TrashContainerServices(IRepository<TrashContainer, int> repository, IRepository<Area, int> areaRepository)
        {
            this.repository = repository;
            this.areaRepository = areaRepository;
        }


        public async Task AddTrashToTheTrashContainer(IEnumerable<TrashContainerInputViewModel> containers)
        {
            foreach (var container in containers)
            {
                var bin = await repository.GetByIdAsync(container.Id);
                if (!bin.IsFilled)
                {
                    bin.FillPercentage = (decimal)container.Percentage;
                    if (bin.FillPercentage >= 100)
                    {
                        bin.FillPercentage = 100;
                        bin.IsFilled = true;
                    }
                    bin.Temperature = container.Temperature;
                    bin.BatteryPercentage = container.BatteryPercentage;
                    
                    await repository.UpdateAsync(bin);
                    
                }
            }
        }

        public IEnumerable<TrashContainerOutputViewModel> GetAll()
        {
            var arr = repository.GetAllAttached().Select(x => new TrashContainerOutputViewModel()
            {
                Id = x.Id,
                Capacity = x.Capacity,
                FillPercentage = (double)x.FillPercentage,        // ← ADD                    // ← ADD
                LocationX = x.LocationX,
                LocationY = x.LocationY,
                Temperature = x.Temperature,
                BatteryPercentage = x.BatteryPercentage,  // ← ADD
                AreaId = x.AreaId
            }).ToArray();

            return arr;
        }

        public async Task RemoveTrashFromTheTrashContainer(int[] containers)
        {
            foreach (var containerId in containers)
            {

                var bin = await repository.GetByIdAsync(containerId);
                double litersToRemove = bin.Capacity * (double)(bin.FillPercentage / 100);
                Truck truck = bin.Area.Truck;
                if (truck.Capacity < litersToRemove)
                {
                    bin.FillPercentage = (decimal)((truck.Capacity / bin.Capacity) * 100);
                    truck.Capacity = 0;
                    bin.IsFilled = false;
                    break;
                }
                else
                {
                    bin.FillPercentage = 0;
                    bin.IsFilled = false;
                    truck.Capacity -= litersToRemove;
                }

            }

        }
    }
}
