-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_DailyAwardList (modified 2021-06-04T01:29:18.137)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_DailyAwardList] 
		   @ID int,
           @Type int,
           @TemplateID int,
           @Count int,
           @ValidDate int,
           @IsBinds bit,
           @Sex int,
           @Remark nvarchar(200),
           @CountRemark nvarchar(100),
           @GetWay int,
           @AwardDays int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from Daily_Award where [ID] = @ID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Daily_Award]
   SET [ID] = @ID
      ,[Type] = @Type
      ,[TemplateID] = @TemplateID
      ,[Count] = @Count
      ,[ValidDate] = @ValidDate
      ,[IsBinds] = @IsBinds
      ,[Sex] = @Sex
      ,[Remark] = @Remark
      ,[CountRemark] = @CountRemark
      ,[GetWay] = @GetWay
      ,[AwardDays] = @AwardDays
 WHERE [ID] = @ID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Daily_Award]
           ([ID]
           ,[Type]
           ,[TemplateID]
           ,[Count]
           ,[ValidDate]
           ,[IsBinds]
           ,[Sex]
           ,[Remark]
           ,[CountRemark]
           ,[GetWay]
           ,[AwardDays])
     VALUES
           (@ID,
           @Type,
           @TemplateID,
           @Count,
           @ValidDate,
           @IsBinds,
           @Sex,
           @Remark,
           @CountRemark,
           @GetWay,
           @AwardDays)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
