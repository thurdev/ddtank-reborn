-- SQL_STORED_PROCEDURE dbo.SP_UsersExtra_Add (modified 2015-03-31T12:10:53.783)

CREATE PROCEDURE [dbo].[SP_UsersExtra_Add]			
   @ID int output,
   @UserID int,
   @starlevel int,
   @nowPosition int,
   @FreeCount int,
   @SearchGoodItems nvarchar (MAX),
   @FreeAddAutionCount int,
   @FreeSendMailCount int,
   @KingBlessInfo varchar (250),
   @MissionEnergy int,
   @buyEnergyCount int,
   @KingBlessEnddate datetime,
   @KingBlessIndex int,
   @DressModelArr nvarchar (MAX),
   @CurentDressModel int,
   @ScoreMagicstone int,
   @DeedInfo nvarchar (250),
   @DeedEnddate datetime,
   @DeedIndex int,
   @Score int,
   @SummerScore int,
   @CatchInsectGetPrize nvarchar (50),
   @PrizeStatus int,
   @CakeStatus bit,
   @NormalFightNum int,
   @HardFightNum int,
   @IsDoubleScore bit,
   @MagpieBridgeItems nvarchar (MAX),
   @NowPositionMB int,
   @LastNum int,
   @MagpieNum int
           
AS
BEGIN    
    INSERT INTO [dbo].[Sys_Users_Extra]
           ([UserID]
           ,[starlevel]
           ,[nowPosition]
           ,[FreeCount]
           ,[SearchGoodItems]
           ,[FreeAddAutionCount]
           ,[FreeSendMailCount]
           ,[KingBlessInfo]
           ,[MissionEnergy]
           ,[buyEnergyCount]
           ,[KingBlessEnddate]
           ,[KingBlessIndex]
           ,[DressModelArr] 
           ,[CurentDressModel]
           ,[ScoreMagicstone]
           ,[DeedInfo]
           ,[DeedEnddate]
           ,[DeedIndex]
           ,Score
         ,SummerScore
         ,CatchInsectGetPrize
         ,PrizeStatus
         ,CakeStatus
         ,NormalFightNum
         ,HardFightNum
         ,IsDoubleScore
         ,MagpieBridgeItems
         ,NowPositionMB
         ,LastNum
         ,MagpieNum)
     VALUES
           (@UserID
           ,@starlevel
           ,@nowPosition
           ,@FreeCount
           ,@SearchGoodItems
           ,@FreeAddAutionCount
           ,@FreeSendMailCount
           ,@KingBlessInfo
           ,@MissionEnergy
           ,@buyEnergyCount
           ,@KingBlessEnddate
           ,@KingBlessIndex
           ,@DressModelArr
           ,@CurentDressModel
           ,@ScoreMagicstone
           ,@DeedInfo
           ,@DeedEnddate
           ,@DeedIndex
           ,@Score
         ,@SummerScore
         ,@CatchInsectGetPrize
         ,@PrizeStatus
         ,@CakeStatus
         ,@NormalFightNum
         ,@HardFightNum
         ,@IsDoubleScore
         ,@MagpieBridgeItems
         ,@NowPositionMB
         ,@LastNum
         ,@MagpieNum)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END


GO
