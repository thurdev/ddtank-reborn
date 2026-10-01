-- SQL_STORED_PROCEDURE dbo.SP_Users_LoginWeb (modified 2021-06-04T05:18:36.243)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：从Web页面登陆过来的验证>
-- =============================================
CREATE Procedure [dbo].[SP_Users_LoginWeb]
@UserName Nvarchar(200),
@PassWord Nvarchar(200),
@FirstValidate bit,
@NickName Nvarchar(200)

as
declare @forbidDate datetime
declare @isExist bit 
declare @lastDate datetime 
declare @lastDateSecond datetime
declare @lastDateThird datetime
declare @loginCount int
declare @isFirst int 
declare @DayLoginCount int
select @forbidDate=ForbidDate,@isExist=IsExist,@lastDate=LastDate,@loginCount=LoginCount,@lastDateSecond=LastDateSecond,@lastDateThird=LastDateThird,@isFirst=IsFirst,@DayLoginCount=DayLoginCount from Sys_Users_Detail where UserName =@UserName and NickName=@NickName

  if MONTH(@lastDate) = MONTH(getdate()) 
  begin
     if DAY(@lastDate)<>DAY(getdate())
        begin
    	set @loginCount = @loginCount+1
           set @DayLoginCount=0
       end
     else
       begin
	set @lastDate=@lastDateSecond
	set @lastDateSecond=@lastDateThird
       end
  end
  else
  begin
    set @loginCount = 1
    set @DayLoginCount=0
  end

if @isFirst=1
begin
   set @DayLoginCount=1
end

if @isFirst>0
begin
   set @isFirst=@isFirst+1
end

if @isExist = 0  

begin
 if datediff(ss,getdate(),@forbidDate)<0 
   begin
     update Sys_Users_Detail set [PassWord] =@PassWord,LastDate = getdate(),IsExist=1,LastDateSecond = @lastDate,LastDateThird = @lastDateSecond,LoginCount=@loginCount,IsFirst=@isFirst,DayLoginCount=@DayLoginCount where UserName =@UserName and NickName=@NickName
    end
end
else
begin
  update Sys_Users_Detail set [PassWord] =@PassWord,LastDate = getdate(),LastDateSecond = @lastDate,LastDateThird = @lastDateSecond,LoginCount=@loginCount,IsFirst=@isFirst,DayLoginCount=@DayLoginCount where UserName =@UserName and NickName=@NickName
end

if @@Error <> 0
begin
  return null
end

select * from V_Sys_Users_Detail where UserName =@UserName and NickName=@NickName







GO
