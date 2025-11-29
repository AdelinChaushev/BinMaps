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
    internal class TrashContainerServices : ITrashContainerServices
    {
        private IRepository<ThrashContainer,int> repository;
        public TrashContainerServices(IRepository<ThrashContainer, int> repository)
        {
            this.repository = repository;
        }
        public async Task AddTrashToTheTrashContainer()
        {
            Random random = new Random();
            foreach (var bin in  repository.GetAllAttached())
            {
                if (!bin.IsFilled)
                {
                    bin.FillPercentage = bin.FillPercentage + random.Next(10, 81);
                    if (bin.FillPercentage >= 100)
                    {
                        bin.FillPercentage = 100;
                        bin.IsFilled = true;
                    }
                    Area area = bin.Area;
                    area.LitersFilled += (bin.Capacity * (double)(bin.FillPercentage / 100));
                    if (area.LitersFilled >= area.Truck.Capacity)
                    {
                        area.IsFull = true;
                    }
                }
                
            }
        }
    }
}
