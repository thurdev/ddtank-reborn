-- SQL_STORED_PROCEDURE dbo.SP_UpdateUsersExtra (modified 2015-03-31T12:11:30.160)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUsersExtra] 
   @ID int,
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
   begin 
UPDATE [dbo].[Sys_Users_Extra]
   SET [starlevel] =@starlevel
      ,[nowPosition] =@nowPosition
      ,[FreeCount] =@FreeCount
      ,[SearchGoodItems] =@SearchGoodItems
      ,[FreeAddAutionCount] =@FreeAddAutionCount
      ,[FreeSendMailCount] =@FreeSendMailCount
      ,[KingBlessInfo] =@KingBlessInfo
      ,[MissionEnergy] =@MissionEnergy
      ,[buyEnergyCount] =@buyEnergyCount
      ,[KingBlessEnddate] = @KingBlessEnddate
      ,[KingBlessIndex] = @KingBlessIndex
      ,[DressModelArr] =@DressModelArr
      ,[CurentDressModel] =@CurentDressModel
      ,[ScoreMagicstone] = @ScoreMagicstone
      ,[DeedInfo] = @DeedInfo
      ,[DeedEnddate] = @DeedEnddate
      ,[DeedIndex] = @DeedIndex
      ,[Score] = @Score
      ,[SummerScore] = @SummerScore
      ,[CatchInsectGetPrize] = @CatchInsectGetPrize
      ,[PrizeStatus] = @PrizeStatus
      ,[CakeStatus] = @CakeStatus
      ,[NormalFightNum] = @NormalFightNum
      ,[HardFightNum] = @HardFightNum
      ,[IsDoubleScore] = @IsDoubleScore
      ,[MagpieBridgeItems] = @MagpieBridgeItems
      ,[NowPositionMB] = @NowPositionMB
      ,[LastNum] = @LastNum
      ,[MagpieNum] = @MagpieNum
      
 WHERE [UserID] =@UserID
   return 0
   end
if(@@error <> 0)
begin
 return 1 
end


GO
