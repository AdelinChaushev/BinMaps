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
        private IRepository<ThrashContainer,int> repository;

        private IRepository<Area, int> areaRepository;

        public TrashContainerServices(IRepository<ThrashContainer, int> repository, IRepository<Area, int> areaRepository)
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
                    Area area = bin.Area;
                    area.LitersFilled += (bin.Capacity * (double)(bin.FillPercentage / 100));
                    if (area.LitersFilled >= area.Truck.Capacity)
                    {
                        area.IsFull = true;
                    }
                    await repository.UpdateAsync(bin);
                    await areaRepository.UpdateAsync(area);
                }
            }
        }

        public IEnumerable<TrashContainerOutputViewModel> GetAll()
        {
          var  arr  =   repository.GetAllAttached().Select(x => new TrashContainerOutputViewModel()
          {
              Id = x.Id,
              Capacity = x.Capacity,
              LocationX = x.LocationX,
              LocationY = x.LocationY,
              AreaId = x.AreaId
          }); 
          return  arr;

        }

        public Task RemoveTrashToTheTrashContainer(int[] containers)
        {
            throw new NotImplementedException();
        }
    }
}
