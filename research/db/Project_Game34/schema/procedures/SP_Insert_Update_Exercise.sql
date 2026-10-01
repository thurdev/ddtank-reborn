-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Exercise (modified 2021-06-04T01:29:18.143)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Exercise] 		   
           @Grage int,
           @GP int,
           @ExerciseA int,
           @ExerciseAG int,
           @ExerciseD int,
           @ExerciseH int,
           @ExerciseL int,
           @setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[ExerciseInfo] where [Grage] = @Grage
if (@count2 <> 0 and @setUpdate = 0)
begin
UPDATE [dbo].[ExerciseInfo]
   SET [Grage] = @Grage
      ,[GP] = @GP
      ,[ExerciseA] = @ExerciseA
      ,[ExerciseAG] = @ExerciseAG
      ,[ExerciseD] = @ExerciseD
      ,[ExerciseH] = @ExerciseH
      ,[ExerciseL] = @ExerciseL
 WHERE [Grage] = @Grage
return 1 
 end
else 
begin
INSERT INTO [dbo].[ExerciseInfo]
           ([Grage]
           ,[GP]
           ,[ExerciseA]
           ,[ExerciseAG]
           ,[ExerciseD]
           ,[ExerciseH]
           ,[ExerciseL])
     VALUES
           (@Grage
           ,@GP
           ,@ExerciseA
           ,@ExerciseAG
           ,@ExerciseD
           ,@ExerciseH
           ,@ExerciseL)
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
