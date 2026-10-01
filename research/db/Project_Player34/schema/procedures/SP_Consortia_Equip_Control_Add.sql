-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Equip_Control_Add (modified 2021-06-04T05:18:34.917)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会财富控制权限>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Equip_Control_Add]
 @ConsortiaID int, 
 @Level int, 
 @Type int, 
 @Riches int,
 @UserID int
AS  

declare  @count int
select @count= count(*) from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @count is null or @count=0
begin
  return 2
end

declare  @temp int
select @temp = count(*) from Consortia_Equip_Control where ConsortiaID=@ConsortiaID and [Level]=@Level and Type=@Type
if @temp=0 
   begin 
     INSERT INTO Consortia_Equip_Control(ConsortiaID, [Level],Type, Riches,IsExist) 
     VALUES(@ConsortiaID, @Level,@Type, @Riches,1)
 end 
 else
   begin 
     UPDATE Consortia_Equip_Control Set  Riches=@Riches, IsExist=1 WHERE ConsortiaID=@ConsortiaID and [Level]=@Level and Type=@Type
   end








GO
