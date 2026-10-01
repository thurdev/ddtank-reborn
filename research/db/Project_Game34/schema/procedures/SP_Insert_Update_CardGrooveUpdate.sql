-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_CardGrooveUpdate (modified 2021-06-04T01:29:18.110)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_CardGrooveUpdate]	
            @Level int
           ,@Type int
           ,@Exp int
           ,@Attack int
           ,@Defend int
           ,@Agility int
           ,@Lucky int
           ,@Damage int
           ,@Guard int
           ,@setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Card_Groove_Update] where [Level] = @Level and [Type] = @Type
if (@count2 <> 0 and @setUpdate = 0)
begin

UPDATE [dbo].[Card_Groove_Update]
   SET [Level] = @Level
      ,[Type] = @Type
      ,[Exp] = @Exp
      ,[Attack] = @Attack
      ,[Defend] = @Defend
      ,[Agility] = @Agility
      ,[Lucky] = @Lucky
      ,[Damage] = @Damage
      ,[Guard] = @Guard
 WHERE [Level] = @Level and [Type] = @Type
 
return 1 
 end
else 
begin

INSERT INTO [dbo].[Card_Groove_Update]
           ([Level]
           ,[Type]
           ,[Exp]
           ,[Attack]
           ,[Defend]
           ,[Agility]
           ,[Lucky]
           ,[Damage]
           ,[Guard])
     VALUES
           (@Level
           ,@Type
           ,@Exp
           ,@Attack
           ,@Defend
           ,@Agility
           ,@Lucky
           ,@Damage
           ,@Guard)
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
