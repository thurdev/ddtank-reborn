-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_RuneTemplate (modified 2021-06-04T01:29:18.227)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_RuneTemplate] 		   
            @TemplateID int
           ,@NextTemplateID int
           ,@Name nvarchar(50)
           ,@BaseLevel int
           ,@MaxLevel int
           ,@Type1 int
           ,@Attribute1 nvarchar(50)
           ,@Turn1 int
           ,@Rate1 int
           ,@Type2 int
           ,@Attribute2 nvarchar(50)
           ,@Turn2 int
           ,@Rate2 int
           ,@Type3 int
           ,@Attribute3 nvarchar(50)
           ,@Turn3 int
           ,@Rate3 int
           ,@setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Rune_Template] where [TemplateID] = @TemplateID
if (@count2 <> 0 and @setUpdate = 0)
begin

UPDATE [dbo].[Rune_Template]
   SET [TemplateID] = @TemplateID
      ,[NextTemplateID] = @NextTemplateID
      ,[Name] = @Name
      ,[BaseLevel] = @BaseLevel
      ,[MaxLevel] = @MaxLevel
      ,[Type1] = @Type1
      ,[Attribute1] = @Attribute1
      ,[Turn1] = @Turn1
      ,[Rate1] = @Rate1
      ,[Type2] = @Type2
      ,[Attribute2] = @Attribute2
      ,[Turn2] = @Turn2
      ,[Rate2] = @Rate2
      ,[Type3] = @Type3
      ,[Attribute3] = @Attribute3
      ,[Turn3] = @Turn3
      ,[Rate3] = @Rate3
 WHERE [TemplateID] = @TemplateID
 
return 1 
 end
else 
begin

INSERT INTO [dbo].[Rune_Template]
           ([TemplateID]
           ,[NextTemplateID]
           ,[Name]
           ,[BaseLevel]
           ,[MaxLevel]
           ,[Type1]
           ,[Attribute1]
           ,[Turn1]
           ,[Rate1]
           ,[Type2]
           ,[Attribute2]
           ,[Turn2]
           ,[Rate2]
           ,[Type3]
           ,[Attribute3]
           ,[Turn3]
           ,[Rate3])
     VALUES
           (@TemplateID
           ,@NextTemplateID
           ,@Name
           ,@BaseLevel
           ,@MaxLevel
           ,@Type1
           ,@Attribute1
           ,@Turn1
           ,@Rate1
           ,@Type2
           ,@Attribute2
           ,@Turn2
           ,@Rate2
           ,@Type3
           ,@Attribute3
           ,@Turn3
           ,@Rate3)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end











GO
