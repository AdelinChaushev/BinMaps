
using BinMaps.Core.Contracts;
using BinMaps.Core.Services;
using BinMaps.Data;
using BinMaps.Data.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
	options.SerializerSettings.TypeNameHandling = Newtonsoft.Json.TypeNameHandling.Auto;
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<BinMapsDbContext>(options =>
	options.UseSqlServer(
		builder.Configuration.GetConnectionString("DefaultConnection"),
		sqlOptions => sqlOptions.EnableRetryOnFailure()
	)
);

var auth = builder.Services.AddAuthentication(options =>
{
	options.DefaultAuthenticateScheme =
		JwtBearerDefaults.AuthenticationScheme;
	options.DefaultChallengeScheme =
		JwtBearerDefaults.AuthenticationScheme;
	options.DefaultScheme =
		JwtBearerDefaults.AuthenticationScheme;
});
var key = Encoding.ASCII.GetBytes(builder.Configuration["JWT:Secret"]);
auth
	.AddCookie(c =>
	{
		c.Cookie.Name = "token";
	})
	.AddJwtBearer(options =>
	{
		options.SaveToken = true;
		options.RequireHttpsMetadata = false;

		options.TokenValidationParameters = new TokenValidationParameters
		{
			ValidateIssuer = false,
			ValidateAudience = false,
			ValidAudience = builder.Configuration["JWT:ValidAudience"],
			ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
			IssuerSigningKey = new SymmetricSecurityKey(key)
		};
		options.Events = new JwtBearerEvents
		{
			OnMessageReceived = context =>
			{
				context.Token = context.Request.Cookies["token"];
				return Task.CompletedTask;
			}
		};



	});
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
	options.Password.RequiredLength = 6;
	options.Password.RequireNonAlphanumeric = false;
	options.Password.RequireDigit = false;
	options.Password.RequireUppercase = false;
	options.Password.RequireLowercase = false;
	options.SignIn.RequireConfirmedAccount = false;
	options.User.RequireUniqueEmail = true;
}).AddEntityFrameworkStores<BinMapsDbContext>();

builder.Services.AddCors(c =>
{
	c.AddPolicy("AllowAll", builder =>
	{
		builder.WithOrigins("http://localhost:3000")
			  .AllowAnyHeader()
			  .AllowAnyMethod()
			  .AllowCredentials();
	});
});
builder.Services.AddScoped(typeof(IRepository<,>), typeof(Repository<,>));
builder.Services.AddScoped<ITrashContainerServices, TrashContainerServices>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAreaAdminService, AdminService>();
builder.Services.AddScoped<IAuthService, AuthService>();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI();
}
app.UseCors("AllowAll");
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BinMapsDbContext>();
    await context.Database.MigrateAsync(); // Applies migrations + HasData

    if (!context.TrashContainers.Any())
    {
        var jsonPath = "C:\\Users\\user.DESKTOP-F7BGVFP\\Desktop\\Backup\\BinMaps\\BinMaps.Data\\Seed\\SeedBins.json";
        if (File.Exists(jsonPath))
        {
            var json = await File.ReadAllTextAsync(jsonPath);
            var bins = JsonSerializer.Deserialize<TrashContainer[]>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (bins != null && bins.Length > 0)
            {
                // Ensure IDs are set if using identity keys
                foreach (var bin in bins)
                {
					bin.Id = 0; // Let the database assign the ID
					context.TrashContainers.Add(bin);
                }
                await context.SaveChangesAsync();
            }
        }
    }
}
app.Run();