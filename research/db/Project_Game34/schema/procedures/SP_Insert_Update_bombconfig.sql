-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_bombconfig (modified 2021-06-04T01:29:18.103)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_bombconfig] 
		   @TemplateID int,
           @Common int,
           @CommonAddWound int,
           @CommonMultiBall int,
           @Special int,
           @setUpdate int
AS
declare @count int

select @count= isnull(count(*),0) from BallConfig where TemplateID  = @TemplateID 
if (@count <> 0 and @setUpdate = 0)
begin
 update [dbo].[BallConfig]
set 
	   [TemplateID] = @TemplateID
      ,[Common] = @Common
      ,[CommonAddWound] = @CommonAddWound
      ,[CommonMultiBall] = @CommonMultiBall
      ,[Special] = @Special
      where TemplateID  = @TemplateID 
      return 1
end
--add Ball
else 
begin
insert into [dbo].[BallConfig]
           ([TemplateID]
           ,[Common]
           ,[CommonAddWound]
           ,[CommonMultiBall]
           ,[Special])
     VALUES
           (@TemplateID,
           @Common,
           @CommonAddWound,
           @CommonMultiBall,
           @Special)
     return 0      
 end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
