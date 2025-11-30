using BinMaps.Common.TrashContainerViewModel;
using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace BinMaps.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrashContainerController : ControllerBase
    { 
       private readonly  ITrashContainerServices _trashContainerServices;

        public TrashContainerController(ITrashContainerServices trashContainerServices)
        {
            _trashContainerServices = trashContainerServices;
        }
        [HttpGet("api/containers")]
        public IActionResult GetAll() => Ok(_trashContainerServices.GetAll());
        [HttpPost("api/AddTrash")]
        public async Task<IActionResult> AddTrashToTheTrashContainer([FromBody]IEnumerable<TrashContainerInputViewModel> containers)
        {
            await _trashContainerServices.AddTrashToTheTrashContainer(containers);
            return Ok();
        }
        [HttpPost("api/DisposeOfTrash")]
        public async Task DisposeOfTrash(int[] containerIds)
        {
             await _trashContainerServices.RemoveTrashFromTheTrashContainer(containerIds);
        }

    }
}
