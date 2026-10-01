-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaUserGrade_Update (modified 2021-06-04T05:18:35.203)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：更新用户职务>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaUserGrade_Update]
 @ID int,
 @ConsortiaID int, 
 @UserID int,
 @UpGrade bit,
 @tempUserName Nvarchar(100) output,
 @tempDutyLevel int output,
 @tempDutyName Nvarchar(100) output,
 @tempRight int output 
 
AS

declare @tempRight1 int
select @tempRight1=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight1 is null or (@tempRight1&2048)=0
begin
  return 2
end

declare @CurrentLevel int
declare @MaxLevel int
declare @Duty int

select @CurrentLevel=[Level],@tempUserName=UserName from V_Consortia_Users where [UserID]=@ID and ConsortiaID=@ConsortiaID and IsExist=1
if @CurrentLevel is null or @CurrentLevel=1
begin
  return 3
end

if @UpGrade=1
begin
  
  if @CurrentLevel=2
  begin
    return 4
  end

  set @CurrentLevel=@CurrentLevel-1
  
  /*select @Duty from Consortia_Duty where [Level]=@CurrentLevel-1 and ConsortiaID=@ConsortiaID and IsExist=1

  if @Duty is null
  begin
    return 5
  end*/

end
else
begin

  select @MaxLevel=[Level] from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1 and [Level] in (select Max([Level]) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1)

  if @MaxLevel is null or @MaxLevel=@CurrentLevel or @MaxLevel<@CurrentLevel
  begin
    return 5
  end

  set @CurrentLevel=@CurrentLevel+1

end

select @Duty=DutyID,@tempDutyLevel=[Level],@tempDutyName=DutyName,@tempRight=[Right] from Consortia_Duty where [Level]=@CurrentLevel and ConsortiaID=@ConsortiaID and IsExist=1

if @Duty is null
begin
  return 6
end

Update Consortia_Users set DutyID = @Duty where [UserID]=@ID and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end


return 0







GO
