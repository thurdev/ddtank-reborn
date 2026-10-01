-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Active (modified 2021-06-04T01:29:18.087)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Active] 
		   @ActiveID int,
           @Title nvarchar(200),
           @Description nvarchar(2000),
           @Content nvarchar(2000),
           @AwardContent nvarchar(2000),
           @HasKey int,
           @StartDate datetime,
           @EndDate datetime,
           @IsOnly int,
           @Type int,
           @ActionTimeContent nvarchar(50),
           @IsAdvance bit,
           @GoodsExchangeTypes nvarchar(50),
           @GoodsExchangeNum nvarchar(50),
           @limitType nvarchar(50),
           @limitValue nvarchar(50),
           @IsShow bit,
           @setUpdate int
           
AS

declare @count int

select @count= isnull(count(*),0) from Active where [ActiveID] =@ActiveID
if (@count <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Active]
   SET [ActiveID] =@ActiveID
      ,[Title] =@Title
      ,[Description] =@Description
      ,[Content] =@Content
      ,[AwardContent] =@AwardContent
      ,[HasKey] =@HasKey
      ,[StartDate] =@StartDate
      ,[EndDate] =@EndDate
      ,[IsOnly] =@IsOnly
      ,[Type] =@Type
      ,[ActionTimeContent] =@ActionTimeContent
      ,[IsAdvance] =@IsAdvance
      ,[GoodsExchangeTypes] =@GoodsExchangeTypes
      ,[GoodsExchangeNum] =@GoodsExchangeNum
      ,[limitType] =@limitType
      ,[limitValue] =@limitValue
      ,[IsShow] = @IsShow
      
	WHERE [ActiveID] =@ActiveID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Active]
           ([ActiveID]
           ,[Title]
           ,[Description]
           ,[Content]
           ,[AwardContent]
           ,[HasKey]
           ,[StartDate]
           ,[EndDate]
           ,[IsOnly]
           ,[Type]
           ,[ActionTimeContent]
           ,[IsAdvance]
           ,[GoodsExchangeTypes]
           ,[GoodsExchangeNum]
           ,[limitType]
           ,[limitValue]
           ,[IsShow])
     VALUES
           (@ActiveID,
           @Title,
           @Description,
           @Content,
           @AwardContent,
           @HasKey,
           @StartDate,
           @EndDate,
           @IsOnly,
           @Type,
           @ActionTimeContent,
           @IsAdvance,
           @GoodsExchangeTypes,
           @GoodsExchangeNum,
           @limitType,
           @limitValue,
           @IsShow)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
