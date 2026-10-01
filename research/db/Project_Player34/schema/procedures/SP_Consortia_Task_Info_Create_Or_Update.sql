-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Task_Info_Create_Or_Update (modified 2021-08-15T03:27:44.160)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Consortia_Task_Info_Create_Or_Update]   
		   @ConsortiaID int,
		   @BeginTime datetime,
		   @Contribution int,
		   @Expirience int,
		   @Offer int,
		   @BuffID int,
		   @Level int,
		    @Riches int,
			@Time int,
           @ConditionData nvarchar(MAX),
		   @RankTable nvarchar(MAX)
           
 AS    
	begin 
	declare @Count int
	select @Count = count(*) from Consortia_Task_Info where ConsortiaID = @ConsortiaID  AND IsExist = 1
	if(@Count = 0)
		begin--khong co du lieu thi insert
			INSERT INTO [dbo].[Consortia_Task_Info]
			   ([ConsortiaID]
			   ,[BeginTime]
			   ,[Contribution]
			   ,[Expirience]
			   ,[Offer]
			   ,[BuffID]
			   ,[Level]
			   ,[Riches]
			   ,[Time]
			   ,[ConditionData]
			   ,RankTable
			   ,IsExist)
		 VALUES
			   (@ConsortiaID
			   ,@BeginTime
			   ,@Contribution
			   ,@Expirience
			   ,@Offer
			   ,@BuffID
			   ,@Level
			   ,@Riches
			   ,@Time
			   ,@ConditionData
			   ,@RankTable
			   ,1)
		end
	else 
		begin
			UPDATE [dbo].[Consortia_Task_Info]
			   SET [BeginTime] = @BeginTime
				  ,[Contribution] = @Contribution
				  ,[Expirience] = @Expirience
				  ,[Offer] = @Offer
				  ,[BuffID] = @BuffID
				  ,[Level] = @Level
				  ,[Riches] = @Riches
				  ,[Time] = @Time
				  ,[ConditionData] = @ConditionData
				  ,RankTable = @RankTable
			 WHERE [ConsortiaID] = @ConsortiaID  AND IsExist = 1
		end
	return 0
	end
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end


GO
